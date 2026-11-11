"use client"

import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { Composer } from "@/components/chat/composer"
import { ContinueDialog } from "@/components/chat/continue-dialog"
import { ExampleQuestions } from "@/components/chat/example-questions"
import { MessageList } from "@/components/chat/message-list"
import { ProfileForm } from "@/components/chat/profile-form"
import { StatusBanner } from "@/components/chat/status-banner"
import { Button } from "@/components/ui/button"
import { fetchHistory, sendMessage } from "@/lib/api-client"
import { chatReducer, initialChatState } from "@/lib/chat-state"
import {
  hasProfileData,
  PROFILE_STORAGE_KEY,
  parseStoredProfile,
  sanitizeProfile,
} from "@/lib/profile-storage"
import {
  invalidLinkNotice,
  randomSessionId,
  resolveInitialSession,
  SESSION_QUERY_PARAM,
  SESSION_STORAGE_KEY,
} from "@/lib/session-id"
import type { RestaurantProfile } from "@/lib/types"

const EXPIRED_SESSION_NOTICE = "Esta conversa não existe mais. Começamos uma nova."
const SIGN_IN_PATH = "/entrar"

// 401: the account session ended (signed out elsewhere, demo expired, account deleted).
function isSignedOut(result: { ok: boolean; status?: number }): boolean {
  return !result.ok && result.status === 401
}

// localStorage can throw (private mode, blocked site data). Without it the session simply
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

function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignored on purpose: see readStorage.
  }
}

// The continuation link works as a credential, so it leaves the address bar right away.
function removeSessionParam(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(SESSION_QUERY_PARAM)) return
  url.searchParams.delete(SESSION_QUERY_PARAM)
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)
}

export function ChatApp() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [profile, setProfile] = useState<RestaurantProfile>({})
  const [draft, setDraft] = useState("")
  // Lets async responses notice that the conversation changed while they were in flight.
  const sessionRef = useRef<string | null>(null)

  // A new id only exists on the server after its first message. Storing it earlier would make a
  // reload before that (or React Strict Mode's second effect run in dev) hit 404 and show the
  // "conversation no longer exists" notice for a conversation that never started. So a new id is
  // stored only once the server knows it: after the history loads or the first reply arrives.
  const adoptSession = useCallback((id: string, persist: boolean) => {
    sessionRef.current = id
    setSessionId(id)
    if (persist) writeStorage(SESSION_STORAGE_KEY, id)
    else removeStorage(SESSION_STORAGE_KEY)
  }, [])

  useEffect(() => {
    let cancelled = false
    setProfile(parseStoredProfile(readStorage(PROFILE_STORAGE_KEY)))

    const queryValue = new URLSearchParams(window.location.search).get(SESSION_QUERY_PARAM)
    const { sessionId: initialId, source } = resolveInitialSession({
      queryValue,
      storedValue: readStorage(SESSION_STORAGE_KEY),
      newId: () => randomSessionId(),
    })
    // A link or stored id is kept until the server says otherwise; a new one waits (see adoptSession).
    adoptSession(initialId, source !== "new")
    removeSessionParam()
    const linkNotice = invalidLinkNotice(queryValue, source)
    if (linkNotice !== null) dispatch({ type: "reset", notice: linkNotice })
    if (source === "new") return

    setLoadingHistory(true)
    void fetchHistory(initialId).then((result) => {
      if (cancelled || sessionRef.current !== initialId) return
      if (isSignedOut(result)) {
        window.location.assign(SIGN_IN_PATH)
        return
      }
      setLoadingHistory(false)
      if (result.ok) {
        writeStorage(SESSION_STORAGE_KEY, initialId)
        dispatch({ type: "history_loaded", messages: result.data.messages })
        const serverProfile = sanitizeProfile(result.data.profile)
        if (hasProfileData(serverProfile)) {
          setProfile(serverProfile)
          writeStorage(PROFILE_STORAGE_KEY, JSON.stringify(serverProfile))
        }
      } else if (result.status === 404) {
        adoptSession(randomSessionId(), false)
        dispatch({ type: "reset", notice: EXPIRED_SESSION_NOTICE })
      } else {
        // ChatAction has no dedicated "history_failed"; send_failed only sets the error here,
        // because there is no pending message yet. The session is kept.
        dispatch({ type: "send_failed", error: result.error })
      }
    })

    return () => {
      cancelled = true
    }
  }, [adoptSession])

  function updateProfile(next: RestaurantProfile): void {
    setProfile(next)
    writeStorage(PROFILE_STORAGE_KEY, JSON.stringify(sanitizeProfile(next)))
  }

  const ready = sessionId !== null && !loadingHistory
  const busy = !ready || state.sending

  async function send(text: string): Promise<void> {
    const message = text.trim()
    const id = sessionRef.current
    if (message === "" || id === null || busy) return

    dispatch({ type: "send_started", text: message, now: new Date().toISOString() })
    setDraft("")
    const cleanProfile = sanitizeProfile(profile)
    const result = await sendMessage({
      sessionId: id,
      message,
      ...(hasProfileData(cleanProfile) ? { profile: cleanProfile } : {}),
    })
    if (isSignedOut(result)) {
      window.location.assign(SIGN_IN_PATH)
      return
    }
    if (sessionRef.current !== id) return

    if (result.ok) {
      writeStorage(SESSION_STORAGE_KEY, id)
      dispatch({ type: "send_succeeded", reply: result.data, now: new Date().toISOString() })
    } else {
      dispatch({ type: "send_failed", error: result.error })
      setDraft(text)
    }
  }

  function startNewConversation(): void {
    adoptSession(randomSessionId(), false)
    dispatch({ type: "reset" })
    setDraft("")
  }

  const empty = state.messages.length === 0

  return (
    <div className="flex flex-col gap-4">
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
      <div className="flex flex-wrap gap-2">
        <ContinueDialog sessionId={sessionId} />
        <Button variant="outline" onClick={startNewConversation} disabled={busy}>
          Nova conversa
        </Button>
      </div>
    </div>
  )
}
