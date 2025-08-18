import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SearchClient } from "./SearchClient";

export const metadata: Metadata = {
  title: "搜索 - Mock Hub",
  description: "搜索项目和 Mock API",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const query = params.q || "";
  const type = params.type || "all";

  if (!query) {
    return <SearchClient query="" results={{ projects: [], mockApis: [] }} />;
  }

  // 搜索项目和Mock API
  const [projects, mockApis] = await Promise.all([
    // 搜索项目
    type === "all" || type === "project"
      ? prisma.project.findMany({
          where: {
            AND: [
              {
                OR: [
                  { creatorId: session.user.id },
                  {
                    members: {
                      some: { userId: session.user.id },
                    },
                  },
                ],
              },
              {
                OR: [
                  { name: { contains: query } },
                  { description: { contains: query } },
                  { shortId: { contains: query } },
                ],
              },
              { status: "ACTIVE" },
            ],
          },
          select: {
            id: true,
            shortId: true,
            name: true,
            description: true,
            updatedAt: true,
            _count: {
              select: {
                mockAPIs: true,
                members: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        })
      : [],

    // 搜索Mock API
    type === "all" || type === "api"
      ? prisma.mockAPI.findMany({
          where: {
            AND: [
              {
                project: {
                  OR: [
                    { creatorId: session.user.id },
                    {
                      members: {
                        some: { userId: session.user.id },
                      },
                    },
                  ],
                  status: "ACTIVE",
                },
              },
              {
                OR: [
                  { name: { contains: query } },
                  { path: { contains: query } },
                  { description: { contains: query } },
                ],
              },
            ],
          },
          select: {
            id: true,
            name: true,
            method: true,
            path: true,
            description: true,
            enabled: true,
            createdAt: true,
            project: {
              select: {
                id: true,
                shortId: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [],
  ]);

  return (
    <SearchClient
      query={query}
      results={{
        projects,
        mockApis,
      }}
    />
  );
}
