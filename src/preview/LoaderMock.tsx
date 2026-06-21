// Unlinked preview of the charging-ember loader. Route: /preview/loader.
import { thesisCss } from '../pathroom/thesisViews';
import { chromeCss, Loader } from '../pathroom/thesisChrome';

export default function LoaderMock() {
  return (
    <div className="thx thxframe"><style>{thesisCss + chromeCss}</style>
      <Loader />
    </div>
  );
}
