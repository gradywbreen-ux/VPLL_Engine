export function Article({ article }) {
  if (!article) return null;
  return (
    <div className="vpll-article">
      <div className="vpll-article-outlet">{article.outlet}</div>
      <h3 className="vpll-article-headline">{article.headline}</h3>
      <div className="vpll-article-meta">{article.gameLabel || ""}</div>
      <div className="vpll-article-body">{article.body}</div>
    </div>
  );
}
