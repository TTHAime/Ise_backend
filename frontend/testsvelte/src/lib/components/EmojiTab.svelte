<script lang="ts">
    const emojiList = ['🍔','🍕','🍣','🍜','🚗','🏠','💡','❤️','🎁','📚','💼','💳','📈','🚌'];

    let {onPick = (value:string) => {}} = $props();
</script>

<div class="grid grid-cols-8 gap-3">
    {#each emojiList as e}
        <button type="button" class="border rounded-lg p-3 hover:bg-gray-100 hover:cursor-pointer" onclick={() => onPick(e)}>
            {e}
        </button>
    {/each}
</div>
