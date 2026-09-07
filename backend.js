'use strict';
/**
 * Ash's backend half: one agent over the user's own machine — the file kit
 * on the home root the enable card disclosed, the shell in the app's
 * workspace (a project's folder for a session inside one), and the image
 * specialist. A capability it cannot reach through `ctx` is a defect in
 * the app contract.
 */
const { defineApp, p } = require('@hearthscale/app');

const PERSONA = [
  'You are Ash, a private assistant.',
  "You may read the user's files silently; every mutating action asks the user first.",
  'Use the tools when they help. Be concise and direct.',
].join(' ');

const ARTIFACTS = [
  'Write a file when the result is a standalone thing the person will keep or use elsewhere:',
  'a report, a document, a chart, a diagram, a picture.',
  'Answer in the chat when the result is a strategy, a summary, an outline or an explanation,',
  'and whenever it is a list or a table, whatever its length.',
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

    // A subagent is a session of its own: it carries nothing of this
    // conversation, and its own tool calls ask in its own transcript.
    await ctx.tools.register({
      name: 'delegate',
      parameters: p.object(
        {
          task: p.string('Everything the subagent needs to do the work, in full'),
          title: p.string('A few words naming the task, shown beside the subagent'),
          app: p.string('Another installed app to do the work in, by its id'),
        },
        ['task', 'title'],
      ),
      execute: async (args, run) => {
        const child = await ctx.sessions.spawn({
          parent: run.sessionId,
          title: String(args.title),
          ...(args.app ? { app: String(args.app) } : {}),
        });
        await ctx.sessions.continue(child, String(args.task));
        const reply = await ctx.sessions.wait(child);
        if (reply.stop !== 'stop') return `The subagent stopped (${reply.stop}): ${reply.text}`;
        return reply.text;
      },
    });

    await ctx.agent((a) => {
      a.prompt.layer('persona', PERSONA, 'static');
      a.prompt.layer('drawing', DRAWING, 'static');
      a.prompt.layer('artifacts', ARTIFACTS, 'static');
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
