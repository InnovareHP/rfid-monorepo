import { Spinner } from "@dashboard/ui/components/spinner";

type Props = {
  isLoading: boolean;
  text?: string;
  overlay?: boolean;
};

const Loader = ({ isLoading, text, overlay = true }: Props) => {
  if (!isLoading) return null;

  if (!overlay) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <Spinner size="default" />
        {text && (
          <span className="text-sm font-medium text-blue-700">{text}</span>
        )}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-lg shadow-lg border-2 border-blue-200">
        <Spinner size="lg" />
        {text && <p className="text-sm font-semibold text-blue-900">{text}</p>}
      </div>
    </div>
  );
};

export default Loader;
