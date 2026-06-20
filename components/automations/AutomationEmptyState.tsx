import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onNew: () => void
}

export function AutomationEmptyState({ onNew }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
        <Zap className="w-8 h-8 text-[#346DF1]" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma automação ainda</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        Crie sua primeira automação para começar a converter comentários em DMs automaticamente.
      </p>
      <Button onClick={onNew} className="bg-[#346DF1] hover:bg-blue-700 text-white">
        + Nova Automação
      </Button>
    </div>
  )
}
