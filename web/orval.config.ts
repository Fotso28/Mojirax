import { defineConfig } from 'orval';

export default defineConfig({
    api: {
        input: './openapi.json',
        output: {
            mode: 'tags-split',
            target: './src/api/generated',
            client: 'axios',
            override: {
                mutator: {
                    path: './src/api/axios-instance.ts',
                    name: 'customAxios'
                }
            }
        }
    }
});
