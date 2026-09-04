export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  Chat: undefined;
  Library: undefined;
  Search: undefined;
  Me: undefined;
};

/**
 * Item detail is pushed on top of whichever tab is active (Library or
 * Search), so it lives in a stack that wraps the tab navigator rather than in
 * the tab param list itself — the same "detail as a route" pattern the web
 * app uses (`/item/[id]`), just expressed as a native-stack screen instead of
 * a URL.
 */
export type RootStackParamList = {
  Main: undefined;
  ItemDetail: { id: string };
};
