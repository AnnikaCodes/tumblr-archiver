CREATE TABLE IF NOT EXISTS posts (
    type                    TEXT NOT NULL,
    is_blocks_post_format   TINYINT NOT NULL,

    -- also need to assert that blogs[id]->name == blog_name
    blog_name               TEXT NOT NULL,

    id                      TEXT NOT NULL,
    post_url                TEXT NOT NULL,
    short_url               TEXT NOT NULL,
    slug                    TEXT NOT NULL,
    timestamp               INTEGER NOT NULL,
    state                   TEXT NOT NULL,
    format                  TEXT NOT NULL,
    reblog_key              TEXT NOT NULL,
    summary                 TEXT NOT NULL,
    note_count              INTEGER NOT NULL,
    title                   TEXT,
    body                    TEXT,
    reblog_comment          TEXT,
    reblog_tree_html        TEXT,

    PRIMARY KEY (id) ON CONFLICT IGNORE, -- should we replace in case of editing
    FOREIGN KEY (blog_name) REFERENCES blogs(name)
);

CREATE TABLE IF NOT EXISTS blogs (
    name                        TEXT PRIMARY KEY NOT NULL,
    title                       TEXT NOT NULL,
    description                 TEXT NOT NULL,
    url                         TEXT NOT NULL,
    uuid                        TEXT NOT NULL,
    updated                     INTEGER NOT NULL,

    avatar_width                INTEGER NOT NULL,
    avatar_height               INTEGER NOT NULL,
    avatar_url                  TEXT NOT NULL,
    posts                       INTEGER NOT NULL,

    theme_header_full_width     INTEGER,
    theme_header_full_height    INTEGER,
    theme_avatar_shape          TEXT,
    theme_background_color      TEXT,
    theme_body_font             TEXT,
    theme_header_bounds         TEXT,
    theme_header_image          TEXT,
    theme_header_image_focused  TEXT,
    theme_header_image_poster   TEXT,
    theme_header_image_scaled   TEXT,
    theme_header_stretch        TINYINT,
    theme_link_color            TEXT,
    theme_show_avatar           TINYINT,
    theme_show_description      TINYINT,
    theme_show_header_image     TINYINT,
    theme_show_title            TINYINT,
    theme_title_color           TEXT,
    theme_title_font            TEXT,
    theme_title_font_weight     TEXT
);

CREATE TABLE IF NOT EXISTS tags (
    post_id     INTEGER NOT NULL,
    tag         TEXT NOT NULL,

    FOREIGN KEY (post_id) REFERENCES posts(id),
    PRIMARY KEY (post_id, tag)
);

CREATE TABLE IF NOT EXISTS trail_items (
    source_post_id  INTEGER NOT NULL,

    blog_name       TEXT NOT NULL,
    post_id         INTEGER NOT NULL,
    content_raw     TEXT NOT NULL,
    content         TEXT,
    is_root_item    TINYINT,

    FOREIGN KEY (source_post_id) REFERENCES posts(id),
    FOREIGN KEY (blog_name) REFERENCES blogs(name)
);
