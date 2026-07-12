# nihongo-quest 素材生成：本機 SD Forge API (AOM3A3_orangemixs)
# 用法: python gen_images.py [--only key1,key2]
import base64, json, sys, time, urllib.request

API = "http://127.0.0.1:7860/sdapi/v1/txt2img"
OUT = r"D:\claude\claude\game\nihongo-quest\assets\img"

STYLE = "masterpiece, best quality, anime style, game art, vibrant colors, detailed"
NEG = ("(worst quality, low quality:1.4), text, watermark, signature, username, "
       "blurry, jpeg artifacts, extra digits, deformed, photo, realistic")
# AOM3 會把生物提示詞強烈拉成少女立繪，生物圖必須用 no humans/pokemon (creature)
# 並在負面排除人形與 NSFW（曾生出裸露幼女圖，見 README）
CREATURE = "no humans, pokemon \\(creature\\), animal focus, solo, full body, centered"
NEG_CREATURE = NEG + (", (1girl:1.4), (human:1.4), 1boy, humanoid, person, kemonomimi, "
                      "animal ears girl, furry female, (nsfw:1.4), nude, navel, underwear, "
                      "cleavage, skirt, dress, thighhighs")
PORTRAIT = (448, 576)   # 立繪卡
WIDE = (768, 448)       # 背景/標題

JOBS = {
    "title":    (WIDE, "cute orange fox spirit with scarf standing on japanese street with red torii gate, "
                       "sunset sky, cherry blossom petals, adventure, dramatic lighting, key visual"),
    "pet_1":    (PORTRAIT, f"{CREATURE}, cute baby fox cub, (fox animal:1.3), quadruped, fluffy orange fur, "
                           "one tail, big sparkling eyes, red neckerchief, sitting, warm cream simple background"),
    "pet_2":    (PORTRAIT, f"{CREATURE}, elegant fox creature, (fox animal:1.3), quadruped, three tails, "
                           "orange and white fur, blue flame wisps, red neckerchief, glowing runes, warm background"),
    "pet_3":    (PORTRAIT, f"{CREATURE}, majestic nine-tailed fox creature, (fox animal:1.3), quadruped, "
                           "golden white fur, divine glowing aura, floating blue flames, celestial sky background"),
    "bg_w1":    (WIDE, "japanese old town street, red torii gate, morning light, cherry blossoms, "
                       "wooden shops, empty street, scenery, no humans"),
    "bg_w2":    (WIDE, "japanese izakaya food alley at night, red lanterns, food stalls, neon signs, "
                       "steam, cozy warm light, scenery, no humans"),
    "bg_w3":    (WIDE, "japanese train station platform, blue hour, shinkansen, departure board, "
                       "clean modern station, scenery, no humans"),
    "bg_w4":    (WIDE, "japanese castle on hill at twilight, purple mystic sky, sakura petals wind, "
                       "glowing spirit wisps, fantasy, scenery, no humans"),
    "enemy_w1": (PORTRAIT, f"{CREATURE}, grumpy round black crow chick monster, (bird:1.3), fat fluffy bird, "
                           "tiny wings, angry eyes, small tengu mask on forehead, purple dusk simple background"),
    "boss_w1":  (PORTRAIT, "crow tengu warrior yokai, red long-nose mask, black wings, monk robe, "
                           "menacing pose, dark sky background, boss monster, solo"),
    "enemy_w2": (PORTRAIT, f"{CREATURE}, kappa monster, (turtle creature:1.3), green shell, water dish on head, "
                           "beak, holding cucumber, mischievous, river simple background"),
    "boss_w2":  (PORTRAIT, f"{CREATURE}, fat tanuki monster, (raccoon dog animal:1.3), chef hat, "
                           "giant wooden ladle, big round belly, smug grin, izakaya night background"),
    "enemy_w3": (PORTRAIT, f"{CREATURE}, chochin obake, (paper lantern monster:1.3), one big eye, "
                           "long red tongue, floating, glowing warm light, dark station simple background"),
    "boss_w3":  (PORTRAIT, "azure eastern dragon coiling around giant clock, glowing blue scales, "
                           "storm clouds, majestic, boss monster, solo"),
    "enemy_w4": (PORTRAIT, f"{CREATURE}, onibi, (floating ball of purple fire:1.4), flame monster, "
                           "glowing yellow eyes and wide grin on the flame, (no body:1.3), no limbs, "
                           "wisps of blue flame, dark castle simple background"),
    "boss_w4":  (PORTRAIT, f"{CREATURE}, giant tengu monster, (demon beast:1.2), red face, long nose, "
                           "black feather wings, holding hand fan, dark purple aura, castle night background"),
    "enemy_review": (PORTRAIT, f"{CREATURE}, haunted flying book monster, (living book:1.3), many eyeballs "
                               "on leather cover, sharp teeth pages, ghostly purple aura, dim library background"),
}

def gen(key, size, prompt):
    body = {
        "prompt": f"{STYLE}, {prompt}",
        "negative_prompt": NEG_CREATURE if "no humans" in prompt else NEG,
        "width": size[0], "height": size[1],
        "steps": 26, "cfg_scale": 7, "sampler_name": "DPM++ 2M Karras",
        "override_settings": {"sd_model_checkpoint": "AOM3A3_orangemixs"},
    }
    req = urllib.request.Request(API, json.dumps(body).encode(), {"Content-Type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.loads(r.read())
    png = base64.b64decode(data["images"][0])
    path = f"{OUT}\\{key}.png"
    with open(path, "wb") as f:
        f.write(png)
    print(f"{key}: {len(png)//1024}KB in {time.time()-t0:.1f}s")

if __name__ == "__main__":
    only = None
    if len(sys.argv) > 2 and sys.argv[1] == "--only":
        only = set(sys.argv[2].split(","))
    for key, (size, prompt) in JOBS.items():
        if only and key not in only:
            continue
        gen(key, size, prompt)
    print("done")
