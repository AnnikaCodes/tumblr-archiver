// Index file

import {config as dotenvConfig} from 'dotenv';
dotenvConfig();

import {createClient} from 'tumblr.js';
import * as SQLite from 'better-sqlite3';
import {readFileSync} from 'fs';

interface Blog {
    name: string;
    title: string;
    description: string;
    url: string;
    uuid: string;
    updated: number;

    avatar: Avatar[];
    posts: number;
    theme: Theme;
}
interface Avatar {
    width: number;
    height: number;
    url: string;
}
interface Theme {
    header_full_width: number;
    header_full_height: number;
    avatar_shape: string;
    background_color: string;
    body_font: string;
    header_bounds: string;
    header_image: string;
    header_image_focused: string;
    header_image_poster: string;
    header_image_scaled: string;
    header_stretch: boolean;
    link_color: string;
    show_avatar: boolean;
    show_description: boolean;
    show_header_image: boolean;
    show_title: boolean;
    title_color: string;
    title_font: string;
    title_font_weight: string;
}

interface Reblog {
    comment: string;
    tree_html: string;
}
interface TrailItem {
    blog: {name: string};
    post: {id: string};
    content_raw: string;
    content: string;
    is_root_item: boolean;
}
interface Post {
    type: string;
    is_blocks_post_format: boolean;
    blog_name: string;
    id: string;
    post_url: string;
    slug: string;
    timestamp: number;
    state: string;
    format: string;
    reblog_key: string;
    tags: string[];
    short_url: string;
    summary: string;
    note_count: number;
    title: string;
    body: string;
    reblog: Reblog;
    trail: TrailItem[];
}
interface PostAPIResponse {
    posts: Post[];
    total_posts: number;
    blog: Blog;
}

const PLACEHOLDER_DESCRIPTION = (
    `*** this is a placeholder added by tumblr-archiver to represent inaccessible blogs; ` +
    `it's not the real blog info. ` +
    'blogs may be inaccessible because they have deactivated ' +
    'or because their owner has set them to only be viewable by logged-in tumblr users. ***'
);
const PLACEHOLDER_THEME = {
    header_full_width: 3000,
    header_full_height: 1055,
    avatar_shape: 'square',
    background_color: '#FFFFFF',
    body_font: 'Helvetica Neue',
    header_bounds: '',
    header_image: 'https://64.media.tumblr.com/9791e3ac6b55616ef7caa5d5fffa1886/41686785bc801181-70/s3000x1055/1ace5908b012e6909a2f2869ede61c92a6764d78.png',
    header_image_focused: 'https://64.media.tumblr.com/9791e3ac6b55616ef7caa5d5fffa1886/41686785bc801181-70/s2048x3072/39abf74863fe12fb9c38acea25d4797053751402.png',
    header_image_poster: '',
    header_image_scaled: 'https://64.media.tumblr.com/9791e3ac6b55616ef7caa5d5fffa1886/41686785bc801181-70/s2048x3072/39abf74863fe12fb9c38acea25d4797053751402.png',
    header_stretch: true,
    link_color: '#00B8FF',
    show_avatar: true,
    show_description: true,
    show_header_image: true,
    show_title: true,
    title_color: '#000000',
    title_font: 'Sans Serif',
    title_font_weight: 'bold',
};

if (process.argv.length < 3) {
    console.log('Please provide at least one blog to archive!');
    process.exit(1);
}
const blogs = process.argv.slice(2).map(x => x.toLowerCase());
const databaseLocation = process.env.DATABASE_LOCATION || 'posts.sqlite';
const db = new SQLite(databaseLocation);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try {
    db.exec(readFileSync('schema.sql', 'utf8'));
} catch (e) {
    console.error('Error creating database schema:', e);
    console.error('Make sure you have a schema.sql file in the current directory.');
}
const insertBlog = db.prepare(
    'INSERT OR REPLACE INTO blogs (' +
    '   name, title, description, url, uuid, updated, avatar_width, avatar_height, avatar_url, posts, ' +
    '   theme_header_full_width, theme_header_full_height, theme_avatar_shape, theme_background_color, ' +
    '   theme_body_font, theme_header_bounds, theme_header_image, theme_header_image_focused, ' +
    '   theme_header_image_poster, theme_header_image_scaled, theme_header_stretch, theme_link_color, ' +
    '   theme_show_avatar, theme_show_description, theme_show_header_image, theme_show_title, ' +
    '   theme_title_color, theme_title_font, theme_title_font_weight' +
    ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
const insertPost = db.prepare(
    'INSERT INTO posts (' +
    '   type, is_blocks_post_format, blog_name, id, post_url, short_url, slug, timestamp,' +
    '   state, format, reblog_key, summary, note_count, title, body, reblog_comment, reblog_tree_html' +
    ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
const insertTag = db.prepare('INSERT OR REPLACE INTO tags (post_id, tag) VALUES (?, ?)');
const insertTrailItem = db.prepare(
    'INSERT INTO trail_items (' +
    '   source_post_id, blog_name, post_id, content_raw, content, is_root_item' +
    ') VALUES (?, ?, ?, ?, ?, ?)'
);
const savedBlogCount = db.prepare('SELECT count(*) FROM blogs WHERE name = ?').pluck(true);
const savePost = db.transaction((post: Post) => {
    insertPost.run(
        post.type,
        Number(post.is_blocks_post_format),
        post.blog_name,
        post.id,
        post.post_url,
        post.short_url,
        post.slug,
        post.timestamp,
        post.state,
        post.format,
        post.reblog_key,
        post.summary,
        post.note_count,
        post.title,
        post.body,
        post.reblog.comment,
        post.reblog.tree_html
    );
    for (const tag of post.tags) {
        insertTag.run(post.id, tag);
    }
    for (const trailItem of post.trail) {
        console.log(trailItem);
        insertTrailItem.run(
            post.id,
            trailItem.blog.name,
            trailItem.post.id,
            trailItem.content_raw,
            trailItem.content,
            Number(trailItem.is_root_item),
        );
    }
});

const api = createClient({
    // consumer_key: process.env.TUMBLR_CONSUMER_KEY,
    // consumer_secret: process.env.TUMBLR_CONSUMER_SECRET,
    returnPromises: true,
});

for (const blog of blogs) {
    (async () => {
        let postsSaved = 0;
        let response;
        do {
            response = await fetchPostsFromAPI(blog, postsSaved);
            if (!response) return;
            saveBlog(response.blog);
            for (const post of response.posts) {
                for (const trailItem of post.trail) {
                    // this prevents foreign key troubles
                    const name = trailItem.blog.name;
                    if (!blogIsSaved(name)) {
                        const blogInfo = await fetchPostsFromAPI(name, postsSaved);
                        const blogData: Blog = blogInfo ? blogInfo.blog : {
                            name,
                            title: `*** ${name} was inaccessible to tumblr-archiver on ${new Date().toISOString()} ***`,
                            description: PLACEHOLDER_DESCRIPTION,
                            url: `https://${name}.tumblr.com/`,
                            updated: -1,
                            uuid: `TUMBLRARCHIVER_PLACEHOLDER_UUID_${name}`,
                            avatar: [{url: `TUMBLRARCHIVER_PLACEHOLDER_AVATAR_${name}`, width: -1, height: -1}],
                            posts: -1,
                            theme: PLACEHOLDER_THEME,
                        };

                        saveBlog(blogData);
                    }
                }
                savePost(post);
                postsSaved++;
            }
        } while (postsSaved < (response.total_posts - 1)); // idk why it's -1
    })().catch(console.error);
}

async function fetchPostsFromAPI(blogName: string, offset: number, depth = 0): Promise<PostAPIResponse | null> {
    try {
        return await new Promise((resolve, reject) => {
            api.blogPosts(blogName, '', {offset: offset}, (err, resp) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(resp);
                }
            });
        });
    } catch (e) {
        if ((e as any).toString().includes('404 Not Found')) {
            console.error(`Blog not found: ${blogName}`);
            return null;
        }
        if ((e as any).toString().includes('429 Limit Exceeded')) {
            console.error(`Rate limit exceeded on blog: ${blogName}`);
            const delay = (2 ** depth) * 20;
            console.error(`Waiting ${delay} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
            return fetchPostsFromAPI(blogName, offset, depth + 1);
        }
        throw e;
    }
}

function saveBlog(blog: Blog) {
    const avatar = blog.avatar.sort((a, b) => b.width - a.width)[0];
    // TODO: simpler to make this use $-variables in sql?
    insertBlog.run(
        blog.name,
        blog.title,
        blog.description,
        blog.url,
        blog.uuid,
        blog.updated,
        avatar.width,
        avatar.height,
        avatar.url,
        blog.posts,

        blog.theme.header_full_width,
        blog.theme.header_full_height,
        blog.theme.avatar_shape,
        blog.theme.background_color,

        blog.theme.body_font,
        blog.theme.header_bounds,
        blog.theme.header_image,
        blog.theme.header_image_focused,

        blog.theme.header_image_poster,
        blog.theme.header_image_scaled,
        Number(blog.theme.header_stretch),
        blog.theme.link_color,

        Number(blog.theme.show_avatar),
        Number(blog.theme.show_description),
        Number(blog.theme.show_header_image),
        Number(blog.theme.show_title),

        blog.theme.title_color,
        blog.theme.title_font,
        blog.theme.title_font_weight,
    );
}

function blogIsSaved(name: string) {
    const count = savedBlogCount.get(name) as number;
    return count > 0;
}
