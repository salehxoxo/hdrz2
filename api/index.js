import axios from "axios";
import { load } from "cheerio";

const base = "https://hdrezka.me/";

const getData = (x) => {
  const v = {
    file3_separator: "//_//",
    bk0: "$$#!!@#!@##",
    bk1: "^^^!@##!!##",
    bk2: "####^!!##!@@",
    bk3: "@@@@@!##!^^^",
    bk4: "$$!!@$$@^!@#$$@",
  };
  let a = x.substr(2);
  for (let i = 4; i >= 0; i--)
    if (v["bk" + i]) {
      a = a.replace(
        v.file3_separator +
          btoa(
            encodeURIComponent(v["bk" + i]).replace(
              /%([0-9A-F]{2})/g,
              (_, p1) => String.fromCharCode("0x" + p1)
            )
          ),
        ""
      );
    }
  try {
    a = decodeURIComponent(
      atob(a)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    a = "";
  }
  return a.split(",").reduce((m, ele) => {
    const [key, value] = ele.split("]");
    m[key.replace("[", "")] = value;
    return m;
  }, {});
};

const main = async (id, type = "movie", _season, _episode) => {
  let params;
  if (type != "movie") {
    params = {
      id: id,
      translator_id: 238,
      season: _season,
      episode: _episode,
      action: "get_stream",
    };
  } else {
    params = {
      id: id,
      translator_id: 238,
      action: "get_movie",
    };
  }
  const resp = (
    await axios.post(
      "https://hdrezka.me/ajax/get_cdn_series/?t=" + new Date().getTime(),
      new URLSearchParams(params).toString()
    )
  ).data;

  return {
    src: getData(resp.url),
    subtitle: resp.subtitle,
  };
};

const getId = async (q, year, type) => {
  const resp = await axios.get(
    "https://hdrezka.me/search/?do=search&subaction=search&q=" + q
  );

  const $ = load(resp.data);
  const id = $(".b-content__inline_item")
    .map((_, e) =>
      $(e)
        .find(".b-content__inline_item-link > div")
        .text()
        .split(",")
        .shift()
        .includes(year) && $(e).find(".entity").text() == type
        ? $(e).attr("data-id")
        : undefined
    )
    .get();

  return id;
};

// Vercel API handler
export default async function handler(req, res) {
  const { id, type, season, episode, query, year } = req.query;

  if (query && year && type) {
    const result = await getId(query, year, type);
    res.json({ result });
  } else if (id) {
    const result = await main(id, type, season, episode);
    res.json({ result });
  } else {
    res.status(400).json({ error: "Invalid request parameters" });
  }
}
