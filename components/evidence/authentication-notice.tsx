import { Info } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function AuthenticationNotice() {
  return (
    <Alert>
      <Info />
      <AlertTitle>Saving an artifact or recording a hash is not authentication</AlertTitle>
      <AlertDescription>
        Provenance status, a stored artifact reference, and a hash establish what the system has on file — they do
        not by themselves establish courtroom authentication or legal chain of custody. Authentication status is
        tracked separately and must be established through proper legal process.
      </AlertDescription>
    </Alert>
  )
}
