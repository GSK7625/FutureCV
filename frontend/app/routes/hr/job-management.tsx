import { HRJobManagementPage } from '~/features/hr/components/HRJobManagementPage';
import { requireRole } from '~/guards/requireRole';

export async function clientLoader() {
  requireRole(['hr', 'employer']);
}

/**
 * FCV-82: Route cho HR Job Management
 * URL: /hr/jobs
 */
export default function HRJobManagementRoute() {
  return <HRJobManagementPage />;
}
