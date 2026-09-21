import { LogOut } from "lucide-react"

import { signOut } from "@/lib/auth/sign-out-action"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut />
        Sign out
      </Button>
    </form>
  )
}
