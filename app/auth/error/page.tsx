import { AlertTriangle } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

  return (
    <Card>
      <CardHeader>
        <AlertTriangle className="mb-2 size-6 text-destructive" />
        <CardTitle>Authentication error</CardTitle>
        <CardDescription>{message ?? "Something went wrong confirming your account."}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" nativeButton={false} render={<Link href="/auth/login">Back to sign in</Link>} />
      </CardContent>
    </Card>
  )
}
