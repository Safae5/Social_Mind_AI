// frontend/src/api/accountManagerApi.js
// API Client — Agent Chef de Compte
// Cohérent avec professionalApi.js du dashboard professionnel
import api from '@/lib/axios'

export const accountManagerApi = {

  // ── Upload fichier réunion + lancement pipeline ────────────
  // Whisper → Mistral 7B → spaCy → ReportLab
  upload: (formData) =>
    api.post('/professional/agents/account-manager/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 min — fichiers réunion jusqu'à 200 Mo, pas seulement de petits clips
    }),

  // ── Historique des analyses ────────────────────────────────
  getAll: () =>
    api.get('/professional/agents/account-manager'),

  // ── Détail complet (profil + entités + stratégie) ─────────
  getOne: (id) =>
    api.get(`/professional/agents/account-manager/${id}`),

  // ── Polling statut pipeline (toutes les 10s) ──────────────
  getStatus: (id) =>
    api.get(`/professional/agents/account-manager/${id}/status`),

  // ── Téléchargement PDF ReportLab ──────────────────────────
  downloadPdf: (id) =>
    api.get(`/professional/agents/account-manager/${id}/pdf`, {
      responseType: 'blob',
    }),
}