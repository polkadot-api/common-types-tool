import { ChainPicker } from "./ChainPicker"
import { CommonTypes } from "./CommonTypes"

function App() {
  return (
    <div className="shadow px-4 py-8 m-auto lg:max-w-4xl lg:mt-10">
      <ChainPicker />
      <CommonTypes className="mt-4" />
    </div>
  )
}

export default App
