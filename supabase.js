import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://icqdmxzcnctwwhfcjqtb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZgGNC48-dnOYdON3FY2rXQ_Tzxz2b8c';

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
  if (!user) return { user: null, isAdmin: false };
  const { data, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (adminError) throw adminError;
  return { user, isAdmin: Boolean(data) };
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    let isAdmin = false;
    if (session?.user) {
      const { data } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      isAdmin = Boolean(data);
    }
    callback({ user: session?.user || null, isAdmin });
  });
}

export async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpAdmin(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function claimInitialAdmin(code) {
  const { data, error } = await supabase.rpc('claim_initial_admin', { p_code: code });
  if (error) throw error;
  return Boolean(data);
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
