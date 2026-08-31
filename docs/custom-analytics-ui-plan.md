# Custom analytics UI — plan

Status: proposed, nothing implemented.

## What is wrong today

`/analytics/custom` renders every saved chart in the organization as a flat
wrap of chips. After the default seeding that is 30-odd chips spanning four
modules, almost all of them system defaults that already live on their module's
dashboard.

- **The list is a table, not a page.** Chips carry a name and a module label.
  Nothing shows what the chart measures or what it looks like.
- **It is a picker.** Clicking a chip renders one chart underneath. Seeing two
  charts at once is impossible, which is the whole point of a dashboard.
- **No editing.** The only affordance on a chip is a trash icon, so the
  conditions and parameters a chart was built with cannot be changed from the
  page that lists it.
- **Delete is one unconfirmed click**, next to seeded defaults a user did not
  create and cannot restore.
- **Three surfaces, no home.** Charts here, dashboards one level down, module
  dashboards under `records/$moduleKey/analytics`. Nothing says which to open.

## The shape to aim for

A chart is only meaningful rendered, at a size, in an order, next to its
siblings. That is the dashboard. So the dashboard becomes the place charts are
edited, and the chart registry goes away rather than being redesigned.

## A. Edit inside the dashboard

Each tile gets a hover action menu:

| Action | Behaviour |
| --- | --- |
| Edit | Opens a side sheet with the builder form; the tile behind it re-renders on save |
| Duplicate | Copies the chart onto the same dashboard, named "... copy" |
| Width | Third / half / two-thirds / full, writing `tileSpan` |
| Delete | Destroys the chart, with a confirm |

A sheet rather than a route: the dashboard stays visible behind it, so the edit
is judged against the page it belongs to. The builder already has a live
preview, which covers "what will this look like" without leaving the page.

`Add chart` on the dashboard creates and attaches in one step, with the module
preselected when the dashboard has one. Today creating a chart and putting it
on a dashboard are two separate journeys.

Drag reorder already works and stays.

## B. Delete the chart registry

Once a chart is created, edited and deleted from the dashboard it sits on,
`/analytics/custom` has no job left. It goes, along with
`custom-analytics-page.tsx`.

Two things it does today have to land somewhere first, or removing it hides
data rather than simplifying:

**1. Charts belonging to no dashboard.** `CustomAnalytic.dashboardId` is
nullable and a dashboard delete is `SetNull`, deliberately — deleting a
dashboard is not supposed to destroy its charts. Remove the registry and those
orphans become invisible and unreachable. Options:

- *Make the relation required.* A chart always belongs to exactly one
  dashboard; deleting a dashboard deletes its charts, with a confirm that says
  so. One correct path, and the model gets simpler. Costs the current safety
  net, and needs a migration that either reassigns or deletes existing orphans.
- *Keep the relation nullable and surface orphans on the dashboards page* as an
  "Unfiled charts" section that only appears when there are any. Preserves
  today's behaviour, one small section instead of a whole route.

The second is the safer default and is what this plan assumes.

**2. Creating a chart on any module.** Today the registry is the only entry
point that is not module-scoped. Replaced by `Add chart` on any dashboard,
which is where a new chart wants to end up anyway.

Nothing else on the page is load-bearing: the date filter, the single-chart
preview and the chip list all have better equivalents on a dashboard.

## C. Entry points

`Reports > Custom Analytics` lands on the dashboards list, since a dashboard is
what someone actually wants to open. No tabs, no second list.

Module analytics keeps its route under `records/$moduleKey/analytics` and gains
the same tile menu, so a seeded chart is editable where it renders.

## Order of work

1. **Tile action menu plus edit sheet**, on both the dashboard view and the
   module analytics page. The one change that answers the complaint. Reuses
   `CustomAnalyticsBuilderForm` unchanged.
2. **Add chart from a dashboard**, creating and attaching together.
3. **Confirm on delete.**
4. **Unfiled charts section** on the dashboards page.
5. **Delete `/analytics/custom`**, its route and `custom-analytics-page.tsx`,
   and point the sidebar at the dashboards list.

Steps 1 to 3 are frontend only. Step 4 needs a list endpoint filtered to
`dashboardId: null`. Step 5 is deletion and routing.

## Open questions

- Width as a tile menu action, or a drag handle on the tile edge? A menu is far
  less work and is keyboard reachable; a drag handle reads better.
- Should a seeded chart be editable in place, or copy-on-edit so the original
  default survives a reseed? Copy-on-edit protects the reseed story but
  surprises someone who just wants to change a filter.
