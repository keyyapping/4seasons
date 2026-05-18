// ============================================================
// SUPABASE CONFIGURATION
// Replace these values with your actual Supabase project credentials
// Get them from: https://supabase.com/dashboard → Project Settings → API
// ============================================================

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// AUTH HELPERS
// ============================================================

async function signUp(email, password, username, minecraftUsername) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        minecraft_username: minecraftUsername,
      }
    }
  });

  if (error) throw error;

  // Insert into profiles table
  if (data.user) {
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: data.user.id,
        username,
        minecraft_username: minecraftUsername,
        email,
        balance: 0,
        created_at: new Date().toISOString()
      });
    if (profileError) throw profileError;
  }

  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
  window.location.href = '/index.html';
}

async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

async function getProfile(userId) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }
  return user;
}

// ============================================================
// RANK HELPERS
// ============================================================

async function getRanks(server) {
  const { data, error } = await supabaseClient
    .from('ranks')
    .select('*')
    .eq('server', server)
    .order('price', { ascending: true });
  if (error) throw error;
  return data;
}

async function purchaseRank(userId, rankId, server, paymentMethod) {
  const { data: rank } = await supabaseClient
    .from('ranks')
    .select('*')
    .eq('id', rankId)
    .single();

  const { data, error } = await supabaseClient
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'rank_purchase',
      rank_id: rankId,
      server,
      amount: rank.price,
      status: 'pending',
      payment_method: paymentMethod,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// TOPUP HELPERS
// ============================================================

async function createTopup(userId, amount, server, paymentMethod) {
  const { data, error } = await supabaseClient
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'topup',
      server,
      amount,
      status: 'pending',
      payment_method: paymentMethod,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// REPORT HELPERS
// ============================================================

async function submitReport(reporterId, reportedUsername, server, reason, evidence) {
  const { data, error } = await supabaseClient
    .from('reports')
    .insert({
      reporter_id: reporterId,
      reported_username: reportedUsername,
      server,
      reason,
      evidence,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// UTILITY
// ============================================================

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</div>
    <div class="toast-message">${message}</div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Loading...';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText;
    btn.disabled = false;
  }
}
