import '../styles.css'
import '../styles/utility.css'
import 'leaflet/dist/leaflet.css'
import type { AppProps } from 'next/app'
import { ConfigProvider } from '../contexts/ConfigContext'

// Read SHOW_DEV_OPTIONS from runtime environment variable
// This allows the same Docker image to be used for staging and prod
// Note: No NEXT_PUBLIC_ prefix needed since we read server-side
function getShowDevOptions(): boolean {
  const value = process.env.SHOW_DEV_OPTIONS
  return value === 'true' || value === '1'
}

// Use getInitialProps to read runtime environment variables
// This is called once per app load (not per page)
App.getInitialProps = async () => {
  return {
    pageProps: {
      showDevOptions: getShowDevOptions(),
    },
  }
}

export default function App({ Component, pageProps }: AppProps & { pageProps?: { showDevOptions?: boolean } }) {
  const showDevOptions = pageProps?.showDevOptions ?? false
  
  return (
    <ConfigProvider showDevOptions={showDevOptions}>
      <Component {...pageProps} />
    </ConfigProvider>
  )
}
