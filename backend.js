'use strict';
/**
 * Ash's backend half: one agent over the user's own machine — the file kit
 * on the home root the enable card disclosed, the shell in the app's
 * workspace (a project's folder for a session inside one), and the image
 * specialist. A capability it cannot reach through `ctx` is a defect in
 * the app contract.
 */
const { defineApp } = require('@hearthscale/app');

const PERSONA = [
  'You are Ash, a private assistant.',
  "You may read the user's files silently; every mutating action asks the user first.",
  'Use the tools when they help. Be concise and direct.',
].join(' ');

const DRAWING = [
  'To draw a diagram, write a fenced code block tagged `mermaid` holding Mermaid source.',
  'To draw a chart, write a fenced code block tagged `vega-lite` holding a Vega-Lite specification as JSON.',
].join(' ');

module.exports = defineApp({
  async activate(ctx) {
    // The file kit spans the home root the enable card disclosed; the shell
    // is rooted at the workspace, because fencing a whole-home shell would
    // stamp millions of ACLs. Reads and writes outside the workspace still
    // go through the file kit.
    const roots = await ctx.roots.list();
    const workspace = roots.find((root) => root.label.includes('~/Hearthscale/Ash')) ?? null;
    const home =
      roots.find((root) => root.label.includes('~') && root !== workspace) ?? roots[0] ?? null;
    const fileRefs = home ? await ctx.tools.file(home.id) : [];
    const shellRef = workspace ? await ctx.tools.shell(workspace.id) : null;
    const imageRef = await ctx.tools.image();

    await ctx.agent((a) => {
      a.prompt.layer('persona', PERSONA, 'static');
      a.prompt.layer('drawing', DRAWING, 'static');
      a.prompt.layer(
        'workspace',
        (c) =>
          c.workspace
            ? `Your file tools reach the whole home folder. Your shell runs in ${c.workspace}; a command that reaches a file outside it asks the user first.`
            : 'Your file tools reach the whole home folder.',
        'session',
      );
      a.prompt.layer(
        'project',
        (c) =>
          c.project
            ? `This conversation belongs to the project "${c.project.name}"; its files live in your shell's folder.${c.project.instructions ? `\nProject instructions:\n${c.project.instructions}` : ''}`
            : '',
        'session',
      );
      a.tools.use(...fileRefs, ...(shellRef ? [shellRef] : []), imageRef);
    });
  },
});
