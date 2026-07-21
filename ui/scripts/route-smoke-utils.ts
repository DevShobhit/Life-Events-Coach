export function classifyRouteResponse(
  status: number,
  contentType: string | null,
  body: string,
  expected: RegExp,
) {
  const genericErrorPage =
    /(?:Application error|Internal Server Error|This page could not be found)/i.test(
      body,
    );
  return {
    contentType: contentType ?? "unknown",
    genericErrorPage,
    markerFound: expected.test(body),
    ok:
      status >= 200 &&
      status < 400 &&
      !genericErrorPage &&
      expected.test(body),
  };
}
