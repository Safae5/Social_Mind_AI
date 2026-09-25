// frontend/src/pages/dashboard/standard/agents/InboxPage.jsx
import { useState } from 'react'
import { ArrowLeft, RefreshCw, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { MessageCard } from '@/components/inbox/MessageCard'
import { ReplyEditor  } from '@/components/inbox/ReplyEditor'
import { InboxConfig  } from '@/components/inbox/InboxConfig'
import {
  useInboxMessages, useRefreshInbox, useMarkRead,
  useApproveReply, useRejectReply, useFlagMessage, useRegenerateReply,
} from '@/hooks/useInbox'
import { useSocialAccounts } from '@/hooks/useScheduler'

const FILTER_TABS = [
  { id: 'pending_approval', label: 'À approuver', icon: '⏳', statKey: 'pending' },
  { id: 'flagged',          label: 'Signalés',    icon: '🚩', statKey: 'flagged' },
  { id: 'auto_replied',     label: 'Auto-répondu',icon: '🤖' },
  { id: 'published',        label: 'Publiés',     icon: '✅' },
  { id: 'hidden',           label: 'Spam masqué', icon: '⚫', statKey: 'spam'    },
  { id: 'all',              label: 'Tous',         icon: '📋', statKey: 'total'  },
]

const cn = (...c) => c.filter(Boolean).join(' ')

export default function InboxPage() {
  const navigate = useNavigate()

  const [activeFilter,   setActiveFilter]  = useState('pending_approval')
  const [selectedMessage,setSelectedMsg]   = useState(null)
  const [showConfig,     setShowConfig]    = useState(false)

  const { data: inboxData, isLoading } = useInboxMessages({
    status   : activeFilter !== 'all' ? activeFilter : undefined,
    show_read: activeFilter === 'all',
  })

  const messages = inboxData?.messages?.data || []
  const stats    = inboxData?.stats || {}

  const { data: accountsData } = useSocialAccounts()
  const accounts = accountsData?.accounts || []

  const refreshMutation    = useRefreshInbox()
  const markReadMutation   = useMarkRead()
  const approveMutation    = useApproveReply()
  const rejectMutation     = useRejectReply()
  const flagMutation       = useFlagMessage()
  const regenerateMutation = useRegenerateReply()

  const handleSelectMessage = (message) => {
    setSelectedMsg(message)
    if (!message.is_read) {
      markReadMutation.mutate(message.id)
    }
  }

  const handleApprove = ({ id, replyText }) => {
    approveMutation.mutate({ id, replyText }, {
      onSuccess: () => setSelectedMsg(null),
    })
  }

  const handleReject = (id) => {
    rejectMutation.mutate(id, {
      onSuccess: () => setSelectedMsg(null),
    })
  }

  const handleFlag = (id) => {
    flagMutation.mutate(id, {
      onSuccess: () => setSelectedMsg(null),
    })
  }

  const handleRegenerate = (id) => {
    regenerateMutation.mutate(id, {
      onSuccess: () => {
        // Met à jour le message sélectionné avec la nouvelle réponse
      },
    })
  }

  return (
    <div className="h-screen bg-[#F8F7F4] flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              💬 Répondeur Automatique
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Twitter-RoBERTa · toxic-bert · Mistral 7B
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Classifiez, approuvez et publiez vos réponses IA
            </p>
          </div>

          {/* Boutons header */}
          <div className="flex gap-2">
            <button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              {refreshMutation.isPending ? 'Actualisation...' : 'Actualiser'}
            </button>
            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Config
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats rapides ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex-shrink-0">
        <div className="flex gap-6">
          {[
            { label: 'Non lus',   value: stats.unread,  color: 'text-indigo-600' },
            { label: 'À approuver',value: stats.pending, color: 'text-amber-600'  },
            { label: 'Signalés',  value: stats.flagged, color: 'text-red-600'    },
            { label: 'Spam',      value: stats.spam,    color: 'text-gray-500'   },
            { label: 'Total',     value: stats.total,   color: 'text-gray-700'   },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-xl font-bold ${color}`}>{value || 0}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — liste messages */}
        <div className="w-80 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">

          {/* Filtres */}
          <div className="p-3 border-b border-gray-100 overflow-x-auto">
            <div className="flex gap-1">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                    activeFilter === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  )}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.statKey && stats[tab.statKey] > 0 && (
                    <span className={cn(
                      'text-[10px] px-1 rounded-full font-bold',
                      activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                    )}>
                      {stats[tab.statKey]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm font-medium text-gray-600">Aucun message</p>
                <p className="text-xs">Actualisez pour voir les nouveaux messages</p>
              </div>
            ) : (
              messages.map(message => (
                <MessageCard
                  key={message.id}
                  message={message}
                  isSelected={selectedMessage?.id === message.id}
                  onClick={() => handleSelectMessage(message)}
                />
              ))
            )}
          </div>
        </div>

        {/* Panneau principal — éditeur */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ReplyEditor
            message={selectedMessage}
            onApprove={handleApprove}
            onReject={handleReject}
            onFlag={handleFlag}
            onRegenerate={handleRegenerate}
            isApproving={approveMutation.isPending}
            isRejecting={rejectMutation.isPending}
            isFlagging={flagMutation.isPending}
            isRegenerating={regenerateMutation.isPending}
            onClose={() => setSelectedMsg(null)}
          />
        </div>
      </div>

      {/* ── Popup Configuration ── */}
      {showConfig && (
        <InboxConfig
          accounts={accounts}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  )
}