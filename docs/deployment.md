### Production Deployment Notes

Depending on the version of vue-cli you must add the proper static url to the `module.exports` of vue.config.js before building with `yarn build`:

vue cli < 3.3
```Javascript
baseUrl: '/Scrollery/v0.3.0/',
```

vue cli >= 3.3
```Javascript
publicPath: process.env.NODE_ENV === 'production'
        ? '/Scrollery/v0.3.0/'
        : '/',
```

Since we use the vue router in history mode, the webserver requires a rewrite rule.  This can be done with Apache using a .htaccess file in the deployment folder:

```xml
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /Scrollery/v0.3.0/index.html [L]
</IfModule>
```

**Note:** you should replace the `v0.3.0` part of both files with your current version tag.