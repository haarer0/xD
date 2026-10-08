import { useState } from 'react'
import { Toolbar } from './components/Toolbar'
import { MatrixTable } from './components/MatrixTable'
import { CubeView } from './components/CubeView'
import { StatusBar } from './components/StatusBar'
import { SchemaModal } from './components/SchemaModal'
import { ResolverModal } from './components/ResolverModal'
import { useProjectStore } from './store/projectStore'
import './App.css'

function App() {
  const viewMode = useProjectStore((s) => s.viewMode)
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [resolverOpen, setResolverOpen] = useState(false)

  return (
    <div className="app">
      <Toolbar />
      <main className="main-stage main-stage-full">
        {viewMode === '2d' ? <MatrixTable /> : <CubeView />}
      </main>
      <StatusBar
        onOpenSchema={() => setSchemaOpen(true)}
        onOpenResolver={() => setResolverOpen(true)}
      />
      <SchemaModal open={schemaOpen} onClose={() => setSchemaOpen(false)} />
      <ResolverModal open={resolverOpen} onClose={() => setResolverOpen(false)} />
    </div>
  )
}

export default App
