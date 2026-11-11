"use client"

import { MenuIcon } from "lucide-react"
import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { Composer } from "@/components/chat/composer"
import { ConversationList } from "@/components/chat/conversation-list"
import { DeleteConversationDialog } from "@/components/chat/delete-conversation-dialog"
import { ExampleQuestions } from "@/components/chat/example-questions"
import { MessageList } from "@/components/chat/message-list"
import { ProfileForm } from "@/components/chat/profile-form"
import { StatusBanner } from "@/components/chat/status-banner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { deleteSession, fetchHistory, listSessions, sendMessage } from "@/lib/api-client"
import { chatReducer, initialChatState } from "@/lib/chat-state"
import {
  hasProfileData,
  PROFILE_STORAGE_KEY,
  parseStoredProfile,
  sanitizeProfile,
} from "@/lib/profile-storage"
import type { ConversationListItem, RestaurantProfile } from "@/lib/types"

const MISSING_SESSION_NOTICE = "Esta conversa não existe mais. Começamos uma nova."
const SIGN_IN_PATH = "/entrar"

// 401: the account session ended (signed out elsewhere, demo expired, account deleted).
function isSignedOut(result: { ok: boolean; status?: number }): boolean {
  return !result.ok && result.status === 401
}

// localStorage can throw (private mode, blocked site data). Without it the profile simply
// does not survive a reload; the chat keeps working.
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignored on purpose: see readStorage.
  }
}

export function ChatApp() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState)
  // null is a new conversation: the server creates the id with the first message.
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [now, setNow] = useState(() => new Date())
  const [panelOpen, setPanelOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [profile, setProfile] = useState<RestaurantProfile>({})
  const [draft, setDraft] = useState("")
  // Lets async responses notice that the conversation changed while they were in flight.
  const sessionRef = useRef<string | null>(null)

  const adoptSession = useCallback((id: string | null) => {
    sessionRef.current = id
    setSessionId(id)
  }, [])

  const refreshList = useCallback(async () => {
    const result = await listSessions()
    if (isSignedOut(result)) {
      window.location.assign(SIGN_IN_PATH)
      return
    }
    // A failed list keeps the previous one: the chat itself still works.
    if (result.ok) {
      setConversations(result.data.sessions)
      setNow(new Date())
    }
  }, [])

  useEffect(() => {
    setProfile(parseStoredProfile(readStorage(PROFILE_STORAGE_KEY)))
    void refreshList()
  }, [refreshList])

  function updateProfile(next: RestaurantProfile): void {
    setProfile(next)
    writeStorage(PROFILE_STORAGE_KEY, JSON.stringify(sanitizeProfile(next)))
  }

  const busy = state.sending || loadingHistory || deleting

  function removeFromList(id: string): void {
    setConversations((items) => items.filter((item) => item.id !== id))
  }

  function startNewConversation(): void {
    adoptSession(null)
    setLoadingHistory(false)
    dispatch({ type: "reset" })
    setDraft("")
    setPanelOpen(false)
  }

  // The server no longer has this conversation (deleted elsewhere, expired, never ours).
  function handleMissingSession(id: string | null): void {
    if (id !== null) removeFromList(id)
    adoptSession(null)
    setLoadingHistory(false)
    dispatch({ type: "reset", notice: MISSING_SESSION_NOTICE })
  }

  async function selectConversation(id: string): Promise<void> {
    setPanelOpen(false)
    if (busy || id === sessionRef.current) return
    adoptSession(id)
    dispatch({ type: "reset" })
    setDraft("")
    setLoadingHistory(true)

    const result = await fetchHistory(id)
    if (isSignedOut(result)) {
      window.location.assign(SIGN_IN_PATH)
      return
    }
    if (sessionRef.current !== id) return
    setLoadingHistory(false)
    if (result.ok) {
      dispatch({ type: "history_loaded", messages: result.data.messages })
      const serverProfile = sanitizeProfile(result.data.profile)
      if (hasProfileData(serverProfile)) updateProfile(serverProfile)
    } else if (result.status === 404) {
      handleMissingSession(id)
    } else {
      // ChatAction has no dedicated "history_failed"; send_failed only sets the error here,
      // because there is no pending message yet. The conversation stays selected.
      dispatch({ type: "send_failed", error: result.error })
    }
  }

  async function send(text: string): Promise<void> {
    const message = text.trim()
    const id = sessionRef.current
    if (message === "" || busy) return

    dispatch({ type: "send_started", text: message, now: new Date().toISOString() })
    setDraft("")
    const cleanProfile = sanitizeProfile(profile)
    const result = await sendMessage({
      ...(id !== null ? { sessionId: id } : {}),
      message,
      ...(hasProfileData(cleanProfile) ? { profile: cleanProfile } : {}),
    })
    if (isSignedOut(result)) {
      window.location.assign(SIGN_IN_PATH)
      return
    }
    if (sessionRef.current !== id) return

    if (result.ok) {
      dispatch({ type: "send_succeeded", reply: result.data, now: new Date().toISOString() })
      if (result.data.sessionId !== null) {
        adoptSession(result.data.sessionId)
        void refreshList()
      }
    } else if (result.status === 404) {
      handleMissingSession(id)
      setDraft(text)
    } else {
      dispatch({ type: "send_failed", error: result.error })
      setDraft(text)
    }
  }

  async function confirmDelete(): Promise<void> {
    const id = pendingDeleteId
    if (id === null) return
    setDeleting(true)
    const result = await deleteSession(id)
    setDeleting(false)
    if (isSignedOut(result)) {
      window.location.assign(SIGN_IN_PATH)
      return
    }
    setPendingDeleteId(null)
    // A 404 means it is already gone, which is what the person asked for.
    if (result.ok || result.status === 404) {
      removeFromList(id)
      if (id === sessionRef.current) startNewConversation()
    } else {
      dispatch({ type: "send_failed", error: result.error })
    }
  }

  const list = (
    <ConversationList
      items={conversations}
      currentId={sessionId}
      disabled={busy}
      now={now}
      onSelect={(id) => void selectConversation(id)}
      onNew={startNewConversation}
      onDelete={setPendingDeleteId}
    />
  )

  const empty = state.messages.length === 0

  return (
    <div className="flex flex-1 gap-6">
      <aside className="hidden w-64 shrink-0 flex-col md:flex">{list}</aside>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="md:hidden">
          <Button variant="outline" onClick={() => setPanelOpen(true)}>
            <MenuIcon aria-hidden="true" />
            Conversas
          </Button>
        </div>
        <ProfileForm profile={profile} onChange={updateProfile} />
        <MessageList messages={state.messages} sending={state.sending} loading={loadingHistory} />
        {empty && !loadingHistory && (
          <ExampleQuestions disabled={busy} onPick={(question) => void send(question)} />
        )}
        <StatusBanner
          error={state.error}
          notice={state.notice}
          onDismiss={() => dispatch({ type: "dismiss" })}
        />
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={() => void send(draft)}
          disabled={busy}
          sending={state.sending}
        />
      </div>
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent
          side="left"
          className="gap-3 overflow-y-auto overscroll-contain p-4 md:hidden"
        >
          <SheetTitle>Conversas</SheetTitle>
          <SheetDescription className="sr-only">
            Escolha uma conversa para continuar ou comece uma nova.
          </SheetDescription>
          {list}
        </SheetContent>
      </Sheet>
      <DeleteConversationDialog
        open={pendingDeleteId !== null}
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
