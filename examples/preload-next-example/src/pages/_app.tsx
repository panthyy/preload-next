import type { AppProps } from "next/app";
import {
  Hydrate,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "react-query";
import "../styles/globals.css";
import { PreloadProvider } from "../../../../";

const queryClient = new QueryClient();

export type PreloadContext = {
  queryClient: QueryClient;
};

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={pageProps.dehydratedState}>
        <PreloadProvider
          resolve={{
            queryClient,
          }}
        >
          <Component {...pageProps} />
        </PreloadProvider>
      </Hydrate>
    </QueryClientProvider>
  );
}
