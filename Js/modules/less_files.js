angular.module('LessFiles', []).value('$LessFiles', {
    common: [
        {
            file: "print.less",
            desc: 'Print media styles',
            add: true
            },
        {
            file: "type.less",
            desc: "Typorgraphy",
            add: true
            },
        {
            file: "code.less",
            desc: "Code",
            add: true
            },
        {
            file: "grid.less",
            desc: "Grid system",
            add: true
            },
        {
            file: "tables.less",
            desc: "Tables",
            add: true
            },
        {
            file: "forms.less",
            desc: "Forms",
            dependents: ["navbar.less", "input-groups.less"],
            add: true
            },
        {
            file: "buttons.less",
            desc: "Buttons",
            dependents: ["button-groups.less"],
            add: true
            },
        {
            file: "responsive-utilities.less",
            desc: "Responsive utilities",
            add: true
            }
            ],
    components: [
        {
            file: "glyphicons.less",
            desc: "Glyphicons",
            add: true
            },
        {
            file: "button-groups.less",
            desc: "Button groups",
            dependencies: ["buttons.less"],
            add: true
            },
        {
            file: "input-groups.less",
            desc: "Input groups",
            dependencies: ["forms.less"],
            add: true
            },
        {
            file: "navs.less",
            desc: "Navs",
            dependencies: ["navbar.less"],
            add: true
            },
        {
            file: "navbar.less",
            desc: "Navbar",
            dependencies: ["forms.less", "navs.less"],
            add: true
            },
        {
            file: "breadcrumbs.less",
            desc: "Breadchumps",
            add: true
            },
        {
            file: "pagination.less",
            desc: "Pagination",
            add: true
            },
        {
            file: "pager.less",
            desc: "Pager",
            add: true
            },
        {
            file: "labels.less",
            desc: "Labels",
            add: true
            },
        {
            file: "badges.less",
            desc: "Badges",
            add: true
            },
        {
            file: "jumbotron.less",
            desc: "Jumbotron",
            add: true
            },
        {
            file: "thumbnails.less",
            desc: "Thumbnails",
            add: true
            },
        {
            file: "alerts.less",
            desc: "Alerts",
            add: true
            },
        {
            file: "progress-bars.less",
            desc: "Progress bars",
            add: true
            },
        {
            file: "media.less",
            desc: "Media items",
            add: true
            },
        {
            file: "list-group.less",
            desc: "List groups",
            add: true
            },
        {
            file: "panels.less",
            desc: "Panels",
            add: true
            },
        {
            file: "responsive-embed.less",
            desc: "Responsive embed",
            add: true
            },
        {
            file: "wells.less",
            desc: "Wells",
            add: true
            },
        {
            file: "close.less",
            desc: "Close icon",
            add: true
            }
            ],
    js_components: [
        {
            file: "component-animations.less",
            desc: "Component animations (for JS)",
            add: true
            },
        {
            file: "dropdowns.less",
            desc: "Dropdowns",
            add: true
            },
        {
            file: "tooltip.less",
            desc: "Tooltips",
            add: true
            },
        {
            file: "popovers.less",
            desc: "Popovers",
            add: true
            },
        {
            file: "modals.less",
            desc: "Modals",
            add: true
            },
        {
            file: "carousel.less",
            desc: "Carousel",
            add: true
            }
            ],
    core: ["mixins.less", "normalize.less", "scaffolding.less", "utilities.less"]
});