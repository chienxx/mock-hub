import { Metadata } from "next";
import { HelpCenterClient } from "./HelpCenterClient";

export const metadata: Metadata = {
  title: "帮助中心 - Mock Hub",
  description: "了解如何使用 Mock Hub",
};

export default function DocsPage() {
  return <HelpCenterClient />;
}
