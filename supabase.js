import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://icqdmxzcnctwwhfcjqtb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZgGNC48-dnOYdON3FY2rXQ_Tzxz2b8c';
const ADMIN_EMAIL = 'vendettavenon@gmail.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const rowToProduct = (row) => ({
  ...(row.payload || {}),
  id: row.id,
  slug: row.slug,
  name: row.name,
  isActive: row.is_active,
  sortOrder: row.sort_order
});

const productToRow = (product) => {
  const payload = structuredClone(product);
  delete payload.__new;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    payload,
    is_active: product.isActive !== false,
    sort_order: Number(product.sortOrder ?? 999)
  };
};

export async function getAuthState() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = session?.user || null;
  if (!user) return { user: null, isAdmin: false, mustChangePassword: false };
  if ((user.email || '').toLowerCase() !== ADMIN_EMAIL) {
    await supabase.auth.signOut();
    return { user: null, isAdmin: false, mustChangePassword: false };
  }
  const { data, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id,must_change_password')
    .eq('user_id', user.id)
    .maybeSingle();
  if (adminError) throw adminError;
  return {
    user,
    isAdmin: Boolean(data),
    mustChangePassword: Boolean(data?.must_change_password)
  };
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    let isAdmin = false;
    let mustChangePassword = false;
    let user = session?.user || null;
    if (user && (user.email || '').toLowerCase() === ADMIN_EMAIL) {
      const { data } = await supabase
        .from('admin_users')
        .select('user_id,must_change_password')
        .eq('user_id', user.id)
        .maybeSingle();
      isAdmin = Boolean(data);
      mustChangePassword = Boolean(data?.must_change_password);
    } else if (user) {
      await supabase.auth.signOut();
      user = null;
    }
    callback({ user, isAdmin, mustChangePassword });
  });
}

export async function signInAdmin(password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password
  });
  if (error) throw error;
  return data;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updateAdminPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  const user = data?.user;
  if (!user || (user.email || '').toLowerCase() !== ADMIN_EMAIL) {
    throw new Error('Conta administrativa inválida.');
  }
  const { error: flagError } = await supabase
    .from('admin_users')
    .update({ must_change_password: false })
    .eq('user_id', user.id);
  if (flagError) throw flagError;
  return user;
}

export async function loadCloudProducts(includeArchived = false) {
  let query = supabase
    .from('products')
    .select('id,slug,name,payload,is_active,sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (!includeArchived) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(rowToProduct);
}

export async function upsertCloudProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .upsert(productToRow(product), { onConflict: 'id' })
    .select('id,slug,name,payload,is_active,sort_order')
    .single();
  if (error) throw error;
  return rowToProduct(data);
}

export async function replaceCloudProducts(products) {
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .not('id', 'is', null);
  if (deleteError) throw deleteError;
  if (!products.length) return [];
  const rows = products.map(productToRow);
  const { data, error } = await supabase
    .from('products')
    .insert(rows)
    .select('id,slug,name,payload,is_active,sort_order');
  if (error) throw error;
  return (data || []).map(rowToProduct);
}
