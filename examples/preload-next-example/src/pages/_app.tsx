import type { AppProps } from "next/app";
import {
  Hydrate,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "react-query";
import { SessionProvider } from "next-auth/react";

const queryClient = new QueryClient();
export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <Hydrate state={pageProps.dehydratedState}>
          <Component {...pageProps} />
        </Hydrate>
      </QueryClientProvider>
    </SessionProvider>
  );
}
