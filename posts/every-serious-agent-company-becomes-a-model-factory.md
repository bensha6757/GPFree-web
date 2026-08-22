---
title: Every serious agent company becomes a model factory
description: At production scale, agent teams stop calling frontier models for everything and start building small trained ones. The factory that produces those models is the scarce thing.
date: 2026-08-22
author: Roi Cohen
slug: every-serious-agent-company-becomes-a-model-factory
draft: true
---

Agents demo beautifully and productionize badly. The gap between the two is where most of the
engineering effort in this industry currently goes, and it has a recognizable shape. You build
something that works, you put it in front of real traffic, and you hit a wall made of three
things at once: latency, cost, and control.

The wall is not a failure of the agent. It is a consequence of how the agent knows things.

## The wall every agent hits

A foundation model knows everything public and nothing about your world. It has never seen your
claims process, your ticket taxonomy, your internal policy document, or the seven ways your
customers describe the same problem. So the standard fix is to tell it, on every single call.
Retrieval, long context windows, few-shot examples, elaborate system prompts. The knowledge
lives outside the model and gets re-injected at inference time, forever.

This works until it does not. Every token of context is latency the user feels and money you pay
again on the next call. Prompts become load-bearing infrastructure that nobody wants to touch.
And when behavior is wrong, the fix is another paragraph of instruction rather than anything you
can measure.

The teams that hit this wall hardest are the ones with the most traffic, which is why the most
sophisticated agent companies got there first.

## What the leaders did about it

They have said publicly what they did. They started training their own models.

Decagon's founders discussed this on
[a16z's podcast in July 2026](https://a16z.com/podcast/how-enterprise-ai-really-gets-deployed/):
the company has moved most of its inference to fine-tuned open-source models, decomposing agent
conversations into discrete tasks that do not require a frontier model's full generality. Their
stated drivers were latency and control over model behavior rather than cost alone. They have
also described running a dedicated internal team that continuously trains new fine-tuned models
and retires them as the open-source frontier moves.

Glean published a similar story with more of the build sheet attached. Their agentic search model,
[Waldo](https://www.glean.com/blog/waldo-launch), is post-trained on NVIDIA's Nemotron 3 Nano to
handle search planning before a frontier model is invoked. They report roughly half the latency
and a quarter fewer tokens with no quality regression. For the training itself they used
[Thinking Machines' Tinker](https://thinkingmachines.ai/tinker/) for LoRA-based fine-tuning,
which let them adapt the model without operating distributed training infrastructure themselves.

Read those two together and a pattern falls out. Both companies concluded that the way to make an
agent fast, cheap, and predictable is to stop asking a general model to be a specialist at
inference time, and instead produce a small model that already is one. Both ended up standing up
an internal capability to manufacture those small models on an ongoing basis.

That capability is a factory. Neither company set out to build one. Production made them.

## The architecture is converging. The factory is not.

Here is the part that I think is underappreciated.

The agent architecture itself is becoming consensus. An orchestrator that plans and routes, with
small specialized models underneath handling the narrow, high-volume, well-defined work. You can
now buy most of the pieces. NVIDIA ships open model families explicitly positioned for this shape
of deployment, and Glean built on one. Fine-tuning as a managed service exists and works. The
reference design is public and the components are commoditizing.

So if the architecture is converging, what is actually scarce?

It is not knowing that you should train small experts. It is being able to keep producing them.

A fine-tuned model is a snapshot of a dataset on the day it was trained. Your policy changes and
the snapshot is subtly wrong. A new product ships and the taxonomy grows a branch the model has
never seen. A better base model comes out three months later and the honest response is to redo
the work. Multiply that by every task an agent handles, then by every customer if you serve more
than one, and the cost of the factory is not the first training run. It is the hundredth, and the
fact that the hundredth arrives on a Tuesday when the team is busy.

This is why Decagon staffing a standing research team to train and deprecate models is the most
interesting detail in either story. That team is the moat, and it is also the tax. Most companies
building agents cannot hire it, and the ones that can would rather spend those researchers on
their actual product.

## What we build

Pelora productizes the factory.

Our engine takes your data - a labeled task, an unlabeled corpus, a body of internal knowledge -
and emits a trained expert for it. About 13 seconds on a commodity GPU, against
roughly 3 hours for the conventional fine-tuning run it replaces, and up to 100x cheaper. There is
no training job to schedule and no accelerator fleet to hold.

Two properties matter more than the speed.

The first is that the orchestrator drives it. The system that notices a capability is missing is
the same system that can produce one, so experts get commissioned, routed to, and retired without
anyone filing a ticket. A factory nobody has to operate is a different product from a faster
training run. Experts are validated before they are used, and that happens quietly.

The second is what seconds do to the economics of staying current. When regeneration is cheap,
an expert stops being an artifact you archive and becomes something you keep fresh. Data drifts,
you regenerate. Policy changes, you regenerate. A better base model lands, and migration is a
pass over the expert cache rather than a quarter of retraining. The snapshot problem stops being
a problem because the snapshot is never old.

The experts are generated from your data, the weights are yours, and for organizations that
cannot send data anywhere - banks, security, government - the whole loop runs on your own GPUs
inside your own perimeter.

Publicly we describe the system at block-diagram level. The engine internals and the verification
design are available under deeper diligence and NDA.

## The bet

The bet is straightforward. If every agent company at scale ends up needing a model factory, and
the agent architecture around it is converging on a common shape, then the factory is where the
durable advantage sits. Building one in-house is a research organization. Buying one should be a
platform.

Use what AI has become - to make AI improve itself.
