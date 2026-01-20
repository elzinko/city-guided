import React, { createContext, useContext } from 'react'

interface ConfigContextValue {
  showDevOptions: boolean
}

const ConfigContext = createContext<ConfigContextValue>({
  showDevOptions: false,
})

export const useConfig = () => useContext(ConfigContext)

interface ConfigProviderProps {
  children: React.ReactNode
  showDevOptions: boolean
}

export function ConfigProvider({ children, showDevOptions }: ConfigProviderProps) {
  return (
    <ConfigContext.Provider value={{ showDevOptions }}>
      {children}
    </ConfigContext.Provider>
  )
}
