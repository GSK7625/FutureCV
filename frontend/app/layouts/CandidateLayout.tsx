import { Outlet } from "react-router";
import { requireRole } from "~/guards/requireRole";
import { PublicHeader } from "./public/PublicHeader";
import { PublicFooter } from "./public/PublicFooter";

export const clientLoader = () => {
  const { user } = requireRole(["candidate"]);
  return { user };
};

export default function CandidateLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />

      <main className="container-page mx-auto flex-1 px-margin-mobile py-8 md:px-margin-desktop">
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  );
}
