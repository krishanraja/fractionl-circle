import { useAppFrame } from '@/hooks/useAppFrame';
import CircleWorkspace from './CircleWorkspace';

export default function CircleApp() {
  useAppFrame();

  return (
    <div className="app-frame">
      <CircleWorkspace />
    </div>
  );
}
