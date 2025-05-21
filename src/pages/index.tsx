import dynamic from 'next/dynamic'

const ThreeScene = dynamic(() => import('../components/threejsScenes'), { ssr: false })

export default function Home() {
  return <ThreeScene />
}