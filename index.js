var PLUGIN_PREFIX = 'bem-tools-';

var fs = require('fs'),
    path = require('path'),
    npm = require('npm');

var bem = require('coa').Cmd()
    .name(process.argv[1])
    .title(['BEM plugins CLI runned.', '' +
        'See https://bem.info for more info.', ''].join('\n'))
    .helpful()
    .opt()
        .name('version').title('Version')
        .short('v').long('version')
        .flag()
        .only()
        .act(function() {
            return require('./package').version;
        })
        .end();

function getBemToolsPlugins() {
    var globalModules, localModules;

    return new Promise(function(resolve, reject) {
        npm.load(function() {
            npm.config.set('global', true);
            require('npm/lib/ls')([], true, function(err, ls) {
                if (err) return reject(err);

                globalModules = _getBemToolsPlugins(ls.dependencies);

                if (localModules) {
                    resolve(Object.assign(globalModules, localModules));
                }
            });

            npm.config.set('global', false)
            require('npm/lib/ls')([], true, function(err, ls) {
                if (err) return reject(err);

                localModules = _getBemToolsPlugins(ls.dependencies);

                if (globalModules) {
                    resolve(Object.assign(globalModules, localModules));
                }
            });
        });
    });
};

function _getBemToolsPlugins(tree) {
    var plugins = {},
        deps = Object.keys(tree);

    deps.forEach(function(depName) {
        var dep = tree[depName];

        if (!plugins[depName] && depName !== 'bem-tools-core' && depName.indexOf(PLUGIN_PREFIX) === 0) {
            plugins[depName] = dep._where;
        }
    });

    // higher level deps override inner ones
    deps.forEach(function(depName) {
        var dep = tree[depName] || {};

        if (dep.dependencies) {
            plugins = Object.assign(_getBemToolsPlugins(dep.dependencies), plugins);
        }
    });

    return plugins;
}

getBemToolsPlugins().then(function(plugins) {
    Object.keys(plugins).forEach(function(plugin) {
        var commandName = plugin.replace(PLUGIN_PREFIX, ''),
            localPluginDir = path.join('node_modules', plugin),
            // globalPluginDir = path.join(npmRootPath, plugin);
            // pluginPath = path.resolve(path.join(fs.existsSync(localPluginDir) ? localPluginDir: globalPluginDir, 'cli')),
            pluginPath = path.resolve(plugins[plugin], 'node_modules', plugin, 'cli'),
            pluginModule = null;

        try {
            pluginModule = require(pluginPath);
        } catch(err) {
            // TODO: implement verbose logging
            // console.warn('Cannot find module', plugin);
        }

        pluginModule && bem.cmd().name(commandName).apply(pluginModule).end();
    });

    bem.run(process.argv.slice(2));
}).catch(console.error);

bem.act(function(opts, args) {
    if (!Object.keys(opts).length && !Object.keys(args).length) {
        return this.usage();
    }
});

module.exports = bem;
