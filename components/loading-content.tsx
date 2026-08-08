import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";
import { Spinner } from "./ui/spinner";

export default function LoaderContent({ text }: { text: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Spinner />
        </EmptyMedia>
        <EmptyTitle>{text}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
