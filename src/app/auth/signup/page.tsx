"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const roleOptions = [
  { value: "designer", label: "設計者" },
  { value: "bim_specialist", label: "BIM専門家" },
  { value: "ifc_specialist", label: "IFC専門家" },
  { value: "bim_software_programmer", label: "BIMソフトプログラマ" },
  { value: "reviewer", label: "審査者" },
  { value: "review_software_programmer", label: "審査ソフトプログラマ" },
] as const;

type RoleValue = (typeof roleOptions)[number]["value"];

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [givenName, setGivenName] = useState("");
  const [role, setRole] = useState<RoleValue>(roleOptions[0].value);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, familyName, givenName, role }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data?.error ?? "登録に失敗しました。");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("登録後のログインに失敗しました。");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">新規登録</h1>
        <p className="text-sm text-muted-foreground">
          必要事項を入力してアカウントを作成します。
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="familyName">
              姓
            </label>
            <input
              id="familyName"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="givenName">
              名
            </label>
            <input
              id="givenName"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={givenName}
              onChange={(event) => setGivenName(event.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="password">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="role">
            ロール
          </label>
          <select
            id="role"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as RoleValue)}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? "登録中..." : "登録する"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        既にアカウントをお持ちですか？{" "}
        <Link className="text-primary hover:underline" href="/auth/signin">
          ログイン
        </Link>
      </p>
    </main>
  );
}
