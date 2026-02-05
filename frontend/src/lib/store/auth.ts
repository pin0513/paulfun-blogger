"use client";

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { User } from "@/types";

// Persist token in localStorage
export const accessTokenAtom = atomWithStorage<string | null>(
  "accessToken",
  null
);
export const refreshTokenAtom = atomWithStorage<string | null>(
  "refreshToken",
  null
);

// User state
export const userAtom = atom<User | null>(null);

// Loading state
export const authLoadingAtom = atom<boolean>(true);

// Computed: is authenticated
export const isAuthenticatedAtom = atom((get) => {
  const token = get(accessTokenAtom);
  const user = get(userAtom);
  return !!token && !!user;
});

// Computed: is admin
export const isAdminAtom = atom((get) => {
  const user = get(userAtom);
  return user?.role === "admin";
});

// Computed: can write (admin or author)
export const canWriteAtom = atom((get) => {
  const user = get(userAtom);
  return user?.role === "admin" || user?.role === "author";
});
