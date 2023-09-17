import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter, Noto_Sans} from 'next/font/google';

import '@/styles/globals.scss';

const inter = Inter({ subsets: ['latin'] });
const notoSans = Noto_Sans({ subsets: ['latin'], weight:["500"], display:"swap"});

function App({ Component, pageProps }: AppProps<{}>) {
  const queryClient = new QueryClient();

  return (
    <div className={notoSans.className}>
      <Toaster />
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </div>
  );
}

export default appWithTranslation(App);
