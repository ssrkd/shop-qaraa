// 🖨️ Vercel API Endpoint для добавления заданий в очередь печати
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials (прямо в коде - для Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://jkzaykobcywanvfgbvci.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpremF5a29iY3l3YW52ZmdidmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODQ5ODQsImV4cCI6MjA3NDU2MDk4NH0.YhrscD_zAgVQCysWcr_P94mZbabJkxasxIITlnatwIs';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 📥 POST - создать задание на печать
  if (req.method === 'POST') {
    try {
      const { type, ...data } = req.body;

      // Валидация
      if (!type || !['receipt', 'report', 'label'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid type. Must be: receipt, report, or label'
        });
      }

      // Создаем задание в очереди
      const { data: job, error } = await supabase
        .from('print_queue')
        .insert({
          type: type,
          data: data,
          status: 'pending',
          created_by: data.seller || data.created_by || 'unknown',
          priority: 0
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Ошибка создания задания:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create print job',
          message: error.message
        });
      }

      console.log(`✅ Задание создано: ${job.id} (${type})`);

      return res.status(200).json({
        success: true,
        message: 'Print job added to queue',
        jobId: job.id,
        status: 'pending'
      });

    } catch (error) {
      console.error('❌ Ошибка:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // 📋 GET - получить статус очереди
  if (req.method === 'GET') {
    try {
      const { status, limit } = req.query;

      let query = supabase
        .from('print_queue')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      if (limit) {
        query = query.limit(parseInt(limit));
      }

      const { data: jobs, error } = await query;

      if (error) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }

      return res.status(200).json({
        success: true,
        jobs: jobs,
        count: jobs.length
      });

    } catch (error) {
      console.error('❌ Ошибка:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Метод не поддерживается
  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}

