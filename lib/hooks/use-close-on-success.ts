import { useEffect, useRef } from "react"

/**
 * Closes a Dialog/Sheet once its useActionState result comes back without an
 * error. Skips the initial mount (state doesn't change then) so it only
 * fires after a real submission resolves successfully.
 */
export function useCloseDialogOnSuccess(state: { error: string | null }, setOpen: (open: boolean) => void) {
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (!state.error) {
      setOpen(false)
    }
  }, [state, setOpen])
}
