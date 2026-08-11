import { useAppFrame } from '@/hooks/useAppFrame';
import HingeCircle from './HingeCircle';

export default function CircleApp() {
  useAppFrame();

  return (
    <div className="app-frame">
      <HingeCircle />
    </div>
  );
}
