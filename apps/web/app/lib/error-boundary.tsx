import { isRouteErrorResponse, useParams } from "react-router";

import { RouteModal } from "~/components/layout/route-modal";
import { RouteErrorPanel } from "~/components/layout/route-error-panel";
import { ErrorLookup } from "~/lib/errors";

type PanelOptions = {
  microLabel?: string;
  description?: string;
};

export function makeRouteErrorBoundary(options: PanelOptions = {}) {
  return function ErrorBoundary({ error }: { error: unknown }) {
    if (isRouteErrorResponse(error)) {
      return (
        <RouteErrorPanel
          status={error.status}
          message={error.data}
          microLabel={options.microLabel}
          description={options.description}
        />
      );
    }
    throw error;
  };
}

type ModalOptions = {
  getReturnTo: (params: Record<string, string | undefined>) => string;
};

export function makeModalErrorBoundary({ getReturnTo }: ModalOptions) {
  return function ErrorBoundary({ error }: { error: unknown }) {
    const params = useParams();
    if (isRouteErrorResponse(error)) {
      const { defaultMicroLabel, defaultDescription } = ErrorLookup(error.status);
      return (
        <RouteModal
          returnTo={getReturnTo(params)}
          title={defaultMicroLabel}
          description={`${error.status} · ${error.data}`}
        >
          <p className="font-mono text-xs text-muted-foreground" role="alert">
            {error.status} · {defaultDescription}
          </p>
        </RouteModal>
      );
    }
    throw error;
  };
}
