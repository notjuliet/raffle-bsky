import { createSignal, Show, type Component } from "solid-js";

import { AtpAgent } from "@atproto/api";

const agent = new AtpAgent({ service: "https://public.api.bsky.app" });

const Raffle: Component = () => {
  const [postURL, setPostURL] = createSignal("");
  const [liked, setLiked] = createSignal(false);
  const [reposted, setReposted] = createSignal(false);
  const [followed, setFollowed] = createSignal(false);
  const [userHandle, setUserHandle] = createSignal("");
  const [avatar, setAvatar] = createSignal("");
  const [status, setStatus] = createSignal("");
  const PAGE_LIMIT = 100;

  const fetch = async () => {
    const fetchLikes = async (uri: string) => {
      const fetchPage = async (cursor?: any) => {
        return await agent.app.bsky.feed.getLikes({
          uri: uri,
          limit: PAGE_LIMIT,
          cursor: cursor,
        });
      };

      let res = await fetchPage();
      let likes = res.data.likes;

      while (res.data.cursor && res.data.likes.length >= PAGE_LIMIT) {
        res = await fetchPage(res.data.cursor);
        likes = likes.concat(res.data.likes);
      }

      return likes;
    };

    const fetchReposts = async (uri: string) => {
      const fetchPage = async (cursor?: any) => {
        return await agent.getRepostedBy({
          uri: uri,
          limit: PAGE_LIMIT,
          cursor: cursor,
        });
      };

      let res = await fetchPage();
      let reposts = res.data.repostedBy;

      while (res.data.cursor && res.data.repostedBy.length >= PAGE_LIMIT) {
        res = await fetchPage(res.data.cursor);
        reposts = reposts.concat(res.data.repostedBy);
      }

      return reposts;
    };

    setStatus("Fetching...");
    setUserHandle("");
    setAvatar("");
    const handle = postURL().split("/")[4];
    const rkey = postURL().split("/").pop()!;
    let did = handle;
    if (!handle.startsWith("did:")) {
      const res = await agent.resolveHandle({ handle: handle });
      did = res.data.did;
    }
    const uri = "at://" + did + "/app.bsky.feed.post/" + rkey;

    let users = new Set<string>();

    if (liked()) {
      const res = await fetchLikes(uri);
      res.forEach((like) => users.add(like.actor.did));
    }

    if (reposted()) {
      const res = await fetchReposts(uri);
      if (liked()) {
        users = users.intersection(new Set(res.map((repost) => repost.did)));
      } else {
        res.forEach((repost) => users.add(repost.did));
      }
    }

    if (followed()) {
      const BATCHSIZE = 30;
      for (let i = 0; i < users.size; i += BATCHSIZE) {
        const res = await agent.app.bsky.graph.getRelationships({
          actor: did,
          others: [...users].slice(i, i + BATCHSIZE),
        });
        res.data.relationships.forEach((actor) => {
          if (!actor.followedBy) {
            users.delete(actor.did);
          }
        });
      }
    }

    const randomIndex = Math.floor(Math.random() * users.size);
    const res = await agent.getProfile({ actor: [...users][randomIndex] });
    setUserHandle(res.data.handle);
    if (res.data.avatar) setAvatar(res.data.avatar);
    setStatus("");
  };

  return (
    <div class="flex flex-col items-center">
      <form
        class="flex flex-col items-center"
        onsubmit={(e) => e.preventDefault()}
      >
        <label for="post">Post:</label>
        <input
          type="text"
          id="post"
          placeholder="URL of the post"
          class="border border-black mt-1 py-1 px-2 mb-3"
          onInput={(e) => setPostURL(e.currentTarget.value)}
        />
        <div class="flex h-6 items-center mb-5 mt-2">
          <input
            type="checkbox"
            id="liked"
            class="h-4 w-4"
            onChange={(e) => setLiked(e.currentTarget.checked)}
          />
          <label for="liked" class="ml-1 select-none mr-4">
            Liked
          </label>
          <input
            type="checkbox"
            id="reposted"
            class="h-4 w-4"
            onChange={(e) => setReposted(e.currentTarget.checked)}
          />
          <label for="reposted" class="ml-1 select-none mr-4">
            Reposted
          </label>
          <input
            type="checkbox"
            id="followed"
            class="h-4 w-4"
            onChange={(e) => setFollowed(e.currentTarget.checked)}
          />
          <label for="followed" class="ml-1 select-none">
            Followed
          </label>
        </div>
        <button
          onclick={() => fetch()}
          class="hover:bg-slate-200 border border-black text-xl font-semibold py-1 px-3"
        >
          <Show when={status()}>{status()}</Show>
          <Show when={!status()}>Roll</Show>
        </button>
      </form>
      <Show when={userHandle()}>
        <div class="flex flex-row items-center mt-5">
          <Show when={avatar()}>
            <div class="mr-4">
              <a href={"https://bsky.app/profile/" + userHandle()}>
                <img class="size-24 rounded-full" src={avatar()} />
              </a>
            </div>
          </Show>
          <div>
            <a
              href={"https://bsky.app/profile/" + userHandle()}
              class="text-blue-600"
            >
              @{userHandle()}
            </a>
          </div>
        </div>
      </Show>
    </div>
  );
};

const App: Component = () => {
  return (
    <div class="flex flex-col items-center m-5">
      <h1 class="text-2xl mb-5">raffle-bsky 🎲</h1>
      <div class="mb-3 text-center">
        <p>
          Roll a random Bluesky user who liked, reposted and/or follows from a
          post
        </p>
        <div>
          <a
            class="text-blue-600 hover:underline"
            href="https://github.com/notjuliet/raffle-bsky"
          >
            Source Code
          </a>
        </div>
        <div>
          <a
            class="text-blue-600 hover:underline"
            href="https://bsky.app/profile/adorable.mom"
          >
            Contact
          </a>
        </div>
      </div>
      <Raffle />
    </div>
  );
};

export default App;
