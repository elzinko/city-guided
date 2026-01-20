import '../styles.css'
import '../styles/utility.css'
import 'leaflet/dist/leaflet.css'
import type { AppProps, AppContext } from 'next/app'
import App from 'next/app'
import { ConfigProvider } from '../contexts/ConfigContext'

// Read SHOW_DEV_OPTIONS from runtime environment variable
// This allows the same Docker image to be used for staging and prod
// Note: No NEXT_PUBLIC_ prefix needed since we read server-side
function getShowDevOptions(): boolean {
  const value = process.env.SHOW_DEV_OPTIONS
  return value === 'true' || value === '1'
}

class MyApp extends App<AppProps & { showDevOptions?: boolean }> {
  // Use getInitialProps to read runtime environment variables
  // This is called once per app load (not per page) and disables automatic static optimization
  static async getInitialProps({ Component, ctx }: AppContext) {
    let pageProps = {}
    
    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx)
    }
    
    return {
      pageProps,
      showDevOptions: getShowDevOptions(),
    }
  }

  render() {
    const { Component, pageProps, showDevOptions = false } = this.props
    
    return (
      <ConfigProvider showDevOptions={showDevOptions}>
        <Component {...pageProps} />
      </ConfigProvider>
    )
  }
}

export default MyApp
