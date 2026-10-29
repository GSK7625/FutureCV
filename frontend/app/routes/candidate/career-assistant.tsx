import { CareerAssistantPage } from "~/features/career-assistant/CareerAssistantPage";
import { useAuthStore } from "~/stores/useAuthStore";

export default function CareerAssistantRoute() {
  const userId = useAuthStore((state) => state.user?.id);
  return <CareerAssistantPage key={userId} />;
}
