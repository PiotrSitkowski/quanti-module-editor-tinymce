export class WorkerEntrypoint<E = unknown> {
    public ctx: ExecutionContext;
    public env: E;
    constructor(ctx: ExecutionContext, env: E) {
        this.ctx = ctx;
        this.env = env;
    }
}
